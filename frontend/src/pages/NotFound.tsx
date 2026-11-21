import { Link } from "react-router";
import { Panel } from "../components/ui/Panel";

export function NotFound({ what, list }: { what: string; list: string }) {
  return (
    <Panel className="mx-auto mt-10 max-w-md text-center">
      <h1 className="font-serif text-3xl">That {what} isn't here</h1>
      <p className="mt-2 text-ink-muted">It may have been deleted.</p>
      <Link to={list} className="mt-4 inline-block font-semibold text-cerulean-strong hover:underline">Back to the list</Link>
    </Panel>
  );
}

export default function NotFoundPage() {
  return <NotFound what="page" list="/" />;
}
