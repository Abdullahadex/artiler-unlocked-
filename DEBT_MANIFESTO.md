# [ATELIER_PROTOCOL]: Technical Debt & Infrastructure Roadmap

## [DEBT_001]: Discourse Hydration Band-Aid (Protocol V5.6)

### Status
**ACTIVE (MOMENTUM_OVER_PURITY)**

### Observed Failure
During the V5.2 deployment, the API encountered a `PGRST200` error (PostgREST relationship mismatch). The database API failed to recognize the Foreign Key link between `protocol_discourse` and `profiles`, resulting in a "Could not find relationship" crash.

### Applied Hack: "Safe-Join" (Manual Hydration)
To unblock the launch and ensure 100% build stability, we moved from a **Database-Level Join** to an **Application-Level Hydration** pattern.
*   **Request 1**: Fetch flat messages.
*   **Request 2**: Batch fetch Profiles.
*   **Merge**: Combined in Node/Edge memory.

### The Cost
1.  **Sequential Latency**: Double-trip to Supabase (O(2) network trips).
2.  **Compute Shift**: Relational logic shifted from optimized C (Postgres) to JavaScript (`.reduce` / `.map`).
3.  **Filtration Complexity**: Filtering by profile properties (e.g., Reputation > 100) now requires fetching all data first.

### [RECOVERY_PLAN]: The Concrete Pour
When the launch window stabilizes, an engineer with **Database-Admin permissions** must perform the following:

1.  **Establish Hard Constraint**: Run this in the Supabase SQL Editor:
    ```sql
    ALTER TABLE public.protocol_discourse 
    ADD CONSTRAINT fk_discourse_profile 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
    ```
2.  **Reload Schema Cache**: In Project Settings > API, click **Reload Schema Cache**.
3.  **Revert Code**: Standardize back to a single relational query in `src/app/api/intel/discourse/route.ts`:
    ```tsx
    const { data } = await supabase
      .from('protocol_discourse')
      .select('*, user:profiles(id, display_name, reputation_score)')
    ```

---

*Protocol Log: V5.7 | 2026-04-17*
*Manifesto Initialized.*
