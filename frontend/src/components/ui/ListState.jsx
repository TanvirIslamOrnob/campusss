import { Message } from './Form.jsx';

export default function ListState({ status, error, count, empty, more, onMore, children }) {
  return (
    <>
      <Message>{error}</Message>
      {status === 'loading' && <p className="py-6 text-center text-sm">Loading…</p>}
      {status === 'ready' && count === 0 && <div className="card">{empty}</div>}
      {children}
      {more && <button onClick={onMore} className="btn-primary mx-auto">Load more</button>}
    </>
  );
}
