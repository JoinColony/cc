import { encode } from 'gpt-3-encoder';
import { remark } from 'remark';
import stripMarkdown, { Root } from 'strip-markdown';

const strip = (markdown: string) => {
  const processed = remark()
    .use(stripMarkdown, {
      keep: ['thematicBreak', 'code', 'inlineCode', 'table', 'tableCell'],
    })
    .processSync(markdown);
  return processed.toString();
};

const tokenSize = (text: string) => encode(text).length;

const split = (tree: Root) => {
  const headings = tree.children
    .map((node, idx) => {
      const newNode = {
        ...node,
        idx,
      };
      return newNode;
    })
    .filter((node) => node.type === 'heading');
  const splitPoints = [0];
  let last = 0;
  for (let idx = 0; idx < headings.length; idx += 1) {
    const node = headings[idx];
    const nodes = tree.children.slice(
      splitPoints[splitPoints.length - 1],
      node.idx,
    );
    const mdString = remark().stringify({ type: 'root', children: nodes });
    if (tokenSize(strip(mdString)) > 3800) {
      splitPoints.push(last);
    }
    last = node.idx;
  }
  splitPoints.push(tree.children.length);
  return splitPoints.slice(1).map((point, idx) => {
    return remark().stringify({
      type: 'root',
      children: tree.children.slice(splitPoints[idx], point),
    });
  });
};

const findTitle = (tree: Root) => {
  const node = tree.children.find((n) => n.type === 'heading' && n.depth === 1);
  if (
    !node ||
    !('children' in node) ||
    !node.children[0] ||
    !('value' in node.children[0])
  ) {
    return 'Untitled';
  }
  return node.children[0].value;
};

export const parseMarkdown = (md: string) => {
  const tree = remark().parse(md);
  const title = findTitle(tree);
  const stripped = strip(md);

  if (tokenSize(stripped) > 3800) {
    const contents = split(tree).map(strip);
    return { title, contents };
  }
  return { title, contents: [stripped] };
};
