import { motion } from 'motion/react';
import { Fragment } from 'react';

/** Word by word reveal for big headings, in the spirit of React Bits' SplitText. */
export function Split({ text, as: Tag = 'h1', className, delay = 0, highlight }: { text: string; as?: 'h1' | 'h2'; className?: string; delay?: number; highlight?: string }) {
  const words = text.split(' ');
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="split-w" aria-hidden="true">
            <motion.span
              className={highlight && w.replace(/[^\w]/g, '') === highlight ? 'hl' : undefined}
              initial={{ y: '105%' }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.8, delay: delay + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  );
}
