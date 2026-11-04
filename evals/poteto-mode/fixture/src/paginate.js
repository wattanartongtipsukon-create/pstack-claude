// Splits items into pages of `size`.
export function paginate(items, size) {
  const count = Math.floor(items.length / size);
  const pages = [];
  for (let i = 0; i < count; i++) pages.push(items.slice(i * size, (i + 1) * size));
  return pages;
}
