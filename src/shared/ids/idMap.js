import idAliases from '../../../public/demo-data/shared/idAliases.json';

/**
 * ID mapping and resolution utilities.
 */

export const getCanonicalId = (entityType, sourceId) => {
  // Simple resolution via aliases mapping
  if (idAliases[sourceId]) {
    return idAliases[sourceId];
  }
  return sourceId;
};

export const isCanonicalId = (entityType, id) => {
  if (!id) return false;
  
  const patterns = {
    factory: /^FAC-\d{3}$/,
    line: /^LINE-\d{2}$/,
    machine: /^MAC-\d{4}$/,
    operator: /^OP-\d{3}$/,
    order: /^ORD-\d{5}$/,
    style: /^STY-\d{5}$/,
    batch: /^BAT-\d{5}$/,
    roll: /^ROLL-\d{5}$/,
    marker: /^MRK-\d{5}$/,
    lay: /^LAY-\d{5}$/,
    shift: /^SHIFT-[A-C]$/,
    component: /^C[1-4]$/
  };

  const pattern = patterns[entityType.toLowerCase()];
  if (!pattern) return true; // If we don't have a strict pattern, assume true for now.

  return pattern.test(id);
};

export const resolveEntity = (entityType, id) => {
  const canonicalId = getCanonicalId(entityType, id);
  if (!isCanonicalId(entityType, canonicalId)) {
    console.warn(`Resolved ID ${canonicalId} does not match canonical pattern for ${entityType}`);
  }
  return canonicalId;
};
