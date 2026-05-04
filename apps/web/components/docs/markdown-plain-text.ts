import { isValidElement, type ReactElement, type ReactNode } from 'react';

/**
 * Flattens react-markdown code block children to a single string for Mermaid source.
 */
export function extractPlainText(node: ReactNode): string {
  if (node == null || node === false || node === true) {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractPlainText).join('');
  }
  if (isValidElement(node)) {
    return extractPlainText((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return '';
}
