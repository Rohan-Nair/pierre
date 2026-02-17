import { Playground } from './Playground';
import Footer from '@/components/Footer';
import { Header } from '@/components/Header';

export default function TryPage() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-5 xl:max-w-[80rem]">
      <Header className="-mb-[1px]" />

      <main className="space-y-6 py-6">
        <Playground />
      </main>

      <Footer />
    </div>
  );
}
