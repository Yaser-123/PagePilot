const str = '[Doc 18, Doc 19]';
const regex = /\[((?:Doc \d+(?:,\s*)?)+)\]/g;
const replaced = str.replace(regex, (match, inner) => {
  const docs = inner.split(/,\s*/);
  console.log('docs:', docs);
  const links = docs.map((doc) => {
    const p1 = doc.replace('Doc ', '').trim();
    return `[[${p1}]](#citation-Doc-${p1})`;
  });
  return links.join(' ');
});
console.log('replaced:', replaced);
