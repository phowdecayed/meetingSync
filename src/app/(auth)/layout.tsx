import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-primary p-12 text-primary-foreground">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-6 h-20 w-20 text-accent"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
          <h1 className="font-headline text-4xl font-bold">MeetingSync</h1>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Streamline your scheduling, one meeting at a time.
          </p>
        </div>
      </div>
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background p-8">
        {children}
      </div>
    </div>
  );
}
