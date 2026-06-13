-- 20260604000018_orders_delete_policy.sql
--
-- Allow admins to DELETE an order. orders had select/insert/update policies but
-- no delete, so RLS denied deletes for everyone. Deleting an order cascades to
-- its proofs, order_events, and invoices (all `on delete cascade`) — the
-- deleteOrder action additionally refuses to delete an order that still has an
-- invoice, so billing records aren't destroyed by accident.

create policy orders_delete_admin on public.orders for delete
  using (public.is_admin());
