/**
 * robots.txt eşleştirmesi (panelde hem sunucu hem tarayıcı kullanır; adres
 * denetimi ve robots.txt sekmesinin denemesi AYNI kural).
 */

/**
 * Google'ın robots.txt kuralı: `User-agent: *` grubu, en uzun eşleşen kural
 * kazanır, eşitlikte Allow. `*` herhangi, sondaki `$` bitiş.
 */
export function robotsIzni(robotsTxt: string, yol: string): { izinli: boolean; kural: string | null } {
  const kurallar: { tur: "allow" | "disallow"; yol: string }[] = [];
  let grupta = false;
  let oncekiAjan = false;
  for (const ham of robotsTxt.split(/\r?\n/)) {
    const satir = ham.replace(/#.*$/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(satir);
    if (!m) continue;
    const alan = m[1].toLowerCase();
    const deger = m[2].trim();
    if (alan === "user-agent") {
      if (!oncekiAjan) grupta = false;
      if (deger === "*") grupta = true;
      oncekiAjan = true;
      continue;
    }
    oncekiAjan = false;
    if (!grupta) continue;
    if ((alan === "allow" || alan === "disallow") && deger) kurallar.push({ tur: alan, yol: deger });
  }
  let en: { tur: "allow" | "disallow"; yol: string } | null = null;
  for (const k of kurallar) {
    const son = k.yol.endsWith("$");
    const govde = son ? k.yol.slice(0, -1) : k.yol;
    const rx = new RegExp(
      "^" + govde.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (son ? "$" : ""),
    );
    if (!rx.test(yol)) continue;
    if (!en || k.yol.length > en.yol.length || (k.yol.length === en.yol.length && k.tur === "allow")) en = k;
  }
  if (!en) return { izinli: true, kural: null };
  return { izinli: en.tur === "allow", kural: `${en.tur === "allow" ? "Allow" : "Disallow"}: ${en.yol}` };
}
