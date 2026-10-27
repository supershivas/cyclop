// Le vent du jour (v0.84.0) : déterministe, dans la fourchette du temps, un mot par force.
import { vent, VENT_FORCE } from '../js/data/meteo.js';

group('vent — un hachage de la graine et du jour');
test('le même pour la même graine et le même jour, autre un autre jour', () => {
  assert.deepEqual(vent('pluie', 7, 3), vent('pluie', 7, 3));
  assert.notDeepEqual(vent('pluie', 7, 3), vent('pluie', 7, 4));
});
test('la force reste dans la fourchette du temps, le cap près de l\'est, un mot toujours', () => {
  for (const [m, [a, b]] of Object.entries(VENT_FORCE)) for (let g = 1; g < 60; g++) {
    const v = vent(m, g, g % 9 + 1);
    assert.ok(v.force >= a && v.force <= b, `${m} ${v.force}`);
    assert.ok(Math.abs(v.ang) <= 1 + 1e-9, m);
    assert.ok(typeof v.nom === 'string' && v.nom.length, m);
  }
});
test('une tempête de neige souffle bien plus fort que le brouillard', () => {
  let t = 0, b = 0; for (let g = 1; g < 40; g++) { t += vent('tempete', g, 2).force; b += vent('brouillard', g, 2).force; }
  assert.ok(t > b * 3);
});
