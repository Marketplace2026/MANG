-- Cart, Orders, and Order Items tables for MANGUE Africa marketplace
-- Table: public.carts
CREATE TABLE public.carts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp WITH TIME ZONE DEFAULT now()
);

-- Table: public.orders
CREATE TABLE public.orders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  total_amount numeric NOT NULL,
  delivery_city text NOT NULL,
  delivery_fee numeric NOT NULL,
  status text CHECK (status IN ('pending','paid','shipped','cancelled')) DEFAULT 'pending',
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- Table: public.order_items
CREATE TABLE public.order_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  qty integer NOT NULL,
  price numeric NOT NULL,
  unit text CHECK (unit IN ('kg','sac','tonne'))
);

-- Row Level Security (RLS) policies
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY cart_owner ON public.carts FOR SELECT, INSERT, UPDATE, DELETE USING (auth.uid() = user_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_owner ON public.orders FOR SELECT, INSERT, UPDATE, DELETE USING (auth.uid() = user_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_item_owner ON public.order_items FOR SELECT, INSERT, UPDATE, DELETE USING (
  auth.uid() = (SELECT user_id FROM public.orders WHERE orders.id = order_id)
);
