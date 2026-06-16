import { DibangWordmark } from './DibangWordmark';

export function Footer() {
  return (
    <footer className="text-center px-6 py-9 pb-10">
      <a
        href="https://digital-guestbook.xyz/"
        target="_blank"
        rel="noopener"
        className="inline-block no-underline transition-opacity duration-200 hover:opacity-80"
      >
        <DibangWordmark className="text-2xl" />
      </a>
    </footer>
  );
}
