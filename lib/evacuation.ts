import type { District } from './data';

export type AssemblyRoute = { id: string; name: string; capacity: number; occupied: number; distance: number; minutes: number; waypoints: string[] };

// Synthetic route graph: no road, elevation or official shelter data is implied.
export function calculateDemoRoutes(district: District, walkingSpeed = 3): AssemblyRoute[] {
  const candidates = [
    { id: 'a', name: `${district.name} assembly point A`, capacity: 500, occupied: 342, segments: [{ name: 'Community access path', km: .6, unstable: false }, { name: 'Lower contour corridor', km: 1.2, unstable: false }] },
    { id: 'b', name: `${district.name} assembly point B`, capacity: 350, occupied: 218, segments: [{ name: 'Valley bypass junction', km: 1.1, unstable: false }, { name: 'Shelter access corridor', km: 1.5, unstable: false }] },
    { id: 'c', name: 'Ridge shortcut · excluded', capacity: 200, occupied: 80, segments: [{ name: 'Unstable slope crossing', km: .7, unstable: true }] },
  ];
  return candidates.filter(c => c.occupied < c.capacity && c.segments.every(s => !s.unstable)).map(c => {
    const distance = c.segments.reduce((total, segment) => total + segment.km, 0);
    return { id: c.id, name: c.name, capacity: c.capacity, occupied: c.occupied, distance, minutes: Math.ceil(distance / walkingSpeed * 60), waypoints: c.segments.map(s => s.name) };
  }).sort((a, b) => a.minutes - b.minutes);
}
