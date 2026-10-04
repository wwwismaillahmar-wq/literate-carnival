-- M03 test mode: user-created social content is published immediately.
-- Moderation remains a future M04 concern; no moderator workflow is removed.

DROP POLICY IF EXISTS "Owners can update own posts in editable states" ON public.posts;
CREATE POLICY "Owners can update own posts"
ON public.posts
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = author_id)
WITH CHECK ((select auth.uid()) = author_id);

DROP POLICY IF EXISTS "Owners can update own contributions in editable states" ON public.contributions;
CREATE POLICY "Owners can update own contributions"
ON public.contributions
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
