-- Security Advisor: corrige "Function Search Path Mutable" na função update_updated_at.
-- Define search_path explícito para evitar que a função use schemas manipuláveis.

ALTER FUNCTION public.update_updated_at() SET search_path = '';
