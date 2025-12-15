-- Update the handle_new_user function to also capture email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'display_name', new.email), new.email);
  RETURN new;
END;
$$;