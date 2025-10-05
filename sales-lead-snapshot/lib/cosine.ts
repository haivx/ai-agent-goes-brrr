export const cosine = (a: Float32Array, b: Float32Array): number => {
  const length = Math.min(a.length, b.length);

  if (length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    const valueA = a[i];
    const valueB = b[i];

    dot += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};
