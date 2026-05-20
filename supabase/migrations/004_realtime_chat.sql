-- Enable realtime for the protocol_discourse table so chat messages sync live
ALTER PUBLICATION supabase_realtime ADD TABLE public.protocol_discourse;
