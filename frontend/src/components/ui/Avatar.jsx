export default function Avatar({ name = '?', url, size = 40 }) {
  const style = { width: size, height: size };
  return url
    ? <img src={url} alt="" style={style} className="shrink-0 rounded-full object-cover" />
    : <div style={style} className="grid shrink-0 place-items-center rounded-full bg-volt-500 text-sm font-bold text-white" aria-hidden>{name[0]?.toUpperCase()}</div>;
}
