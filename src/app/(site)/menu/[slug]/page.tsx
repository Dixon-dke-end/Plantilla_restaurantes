import { DishDetailContainer } from "@/modules/menu/ui/DishDetailContainer";
import { PageTransition } from "@/shared/ui/PageTransition";

export default async function DishPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // No <Suspense> here on purpose: if the container's chunk suspended into a fallback, React would
  // commit the fallback first and the card image could not morph into the viewer (no shared-element
  // pair). The container renders its own loading skeleton.
  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <DishDetailContainer key={slug} slug={slug} />
      </div>
    </PageTransition>
  );
}
