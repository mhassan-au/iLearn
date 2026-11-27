// Public entry point for the learning platform.
import Link from "next/link";

export default function Home() {
  return (
    <section className="panel space-y-6">
      <h1>Learn at your own pace.</h1>
      <p>Work through structured lessons, knowledge checks and practical exercises, one activity at a time.</p>
      <Link className="button" href="/dashboard">Open My learning</Link>
    </section>
  );
}
