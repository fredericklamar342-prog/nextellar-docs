import { Pencil } from 'lucide-react';

const GITHUB_REPO = 'https://github.com/nextellarlabs/nextellar-docs';
const DOCS_BRANCH = 'main';

interface EditThisPageProps {
  filePath: string; // e.g. "cli/overview"
}

export default function EditThisPage({ filePath }: EditThisPageProps) {
  const href = `${GITHUB_REPO}/blob/${DOCS_BRANCH}/docs/${filePath}.mdx`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
    >
      <Pencil size={14} />
      Edit this page
    </a>
  );
}
