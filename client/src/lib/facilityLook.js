/*Map a facility type name to an icon and a short blurb.*/

const LOOK = [ 
  { match: 'tennis court', icon: 'bi-circle', blurb: 'Clay courts under the pines', }, 
  { match: 'table tennis', icon: 'bi-table', blurb: 'Indoor tables, quick games', }, 
  { match: 'basketball', icon: 'bi-dribbble', blurb: 'Open-air hardcourt', }, 
  { match: 'volleyball', icon: 'bi-circle-fill', blurb: 'Sand and grass courts', }, 
  { match: 'soccer', icon: 'bi-shield-fill', blurb: 'Full-size natural pitch', }, 
  { match: 'cycling', icon: 'bi-bicycle', blurb: 'Rolling tracks through the park', }, 
];

export function facilityLook(name = '') {
  const lower = name.toLowerCase();
  const hit = LOOK.find((entry) => lower.includes(entry.match));
  return hit ?? { icon: 'bi-geo-alt', blurb: 'Sport facility' };
}
