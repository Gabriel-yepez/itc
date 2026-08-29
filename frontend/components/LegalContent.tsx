import Link from "next/link";
import ReactMarkdown from "react-markdown";

export default function LegalContent({ content }: { content: string }) {
  return (
    <div className="prose prose-neutral max-w-none font-body text-base text-black leading-relaxed">
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h2 className="font-headline text-xl font-bold text-black mb-3 mt-8 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-headline text-lg font-bold text-black mb-2 mt-6">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="font-body text-base text-black leading-relaxed mb-4">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-black">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-6 space-y-2 mb-4 text-black">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-6 space-y-2 mb-4 text-black">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="font-body text-base text-black">{children}</li>
          ),
          a: ({ href, children }) => {
            const isExternal = href?.startsWith("http");
            if (isExternal) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-semibold hover:underline"
                >
                  {children}
                </a>
              );
            }
            return (
              <Link
                href={href ?? "#"}
                className="text-primary font-semibold hover:underline"
              >
                {children}
              </Link>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
