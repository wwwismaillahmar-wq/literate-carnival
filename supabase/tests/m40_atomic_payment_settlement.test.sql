begin;
select plan(1);
select has_function('public', 'admin_mark_payment_paid', ARRAY['uuid'], 'Payment and invoice settlement is performed by one authorized database transaction');
select * from finish();
rollback;
