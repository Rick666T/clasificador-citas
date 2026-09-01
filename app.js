"use strict";

const RESULT_BATCH_SIZE = 100;
const MAX_AUTHOR_ZONE_LENGTH = 1600;

const SURNAME_PARTICLES = new Set([
  "da",
  "das",
  "de",
  "del",
  "den",
  "der",
  "di",
  "do",
  "dos",
  "du",
  "la",
  "las",
  "le",
  "los",
  "van",
  "von",
]);

const CONNECTOR_TOKENS = new Set(["and", "e", "et", "al", "y"]);
const NAME_NOISE_TOKENS = new Set([
  "dr",
  "dra",
  "jr",
  "mr",
  "mrs",
  "ms",
  "prof",
  "sr",
  "sra",
  "sir",
]);
const NAME_SUFFIXES = new Set(["ii", "iii", "iv", "jr", "sr"]);

const EXAMPLE = {
  document:
    "Tavira S\u00e1nchez, R., Turnbull Mu\u00f1oz, F. R., & L\u00f3pez Andrade, M. (2024). Modelo ficticio para analizar servicios de informaci\u00f3n acad\u00e9mica. Revista Universitaria Imaginaria, 12(2), 40\u201358.",
  authors:
    "Tavira S\u00e1nchez, R.\nTurnbull Mu\u00f1oz, F. R.\nL\u00f3pez Andrade, M.",
  evaluated: "Tavira S\u00e1nchez, R.",
  citing: [
    "Ortega Paz, N., & Salgado Cruz, M. (2025). Indicadores simulados para comunidades acad\u00e9micas. Anuario Ficticio de Bibliometr\u00eda, 4(1), 10\u201322.",
    "Turnbull-Mu\u00f1oz, F. R., & Torres Le\u00f3n, P. (2025). Redes de colaboraci\u00f3n en un campus hipot\u00e9tico. Cuadernos Imaginarios de Informaci\u00f3n, 7(3), 51\u201366.",
    "L\u00f3pez-Andrade, M., & Castillo Mora, A. (2026). Estudio imaginario de colaboraci\u00f3n acad\u00e9mica. Revista de Pruebas Documentales, 6(1), 20\u201333.",
    "Tavira-S\u00e1nchez, R., & Vega Sol\u00eds, C. (2026). Un modelo simulado para analizar transferencia de conocimiento. Revista Ficticia de Ciencia Abierta, 9(1), 1\u201318.",
    "Tavira, R., & N\u00fa\u00f1ez Lara, T. (2026). Evaluaci\u00f3n hipot\u00e9tica de redes universitarias. Estudios Inventados de Gesti\u00f3n, 5(2), 73\u201389.",
    "Tavria-S\u00e1nchez, R., & Campos Vera, L. (2026). Prueba ficticia de robustez para nombres de autor. Bolet\u00edn Simulado de Datos, 3(2), 70\u201384.",
  ].join("\n"),
};

const elements =
  typeof document === "undefined"
    ? null
    : {
        documentReference: document.querySelector("#documentReference"),
        authorsInput: document.querySelector("#authorsInput"),
        authorPreview: document.querySelector("#authorPreview"),
        evaluatedAuthor: document.querySelector("#evaluatedAuthor"),
        citingInput: document.querySelector("#citingInput"),
        referenceCount: document.querySelector("#referenceCount"),
        errorMessage: document.querySelector("#errorMessage"),
        resultsSection: document.querySelector("#resultsSection"),
        resultsDescription: document.querySelector("#resultsDescription"),
        countA: document.querySelector("#countA"),
        countB: document.querySelector("#countB"),
        countC: document.querySelector("#countC"),
        eligibleTotal: document.querySelector("#eligibleTotal"),
        resultsBody: document.querySelector("#resultsBody"),
        pagination: document.querySelector("#pagination"),
        paginationText: document.querySelector("#paginationText"),
        showMoreButton: document.querySelector("#showMoreButton"),
        showAllButton: document.querySelector("#showAllButton"),
        analyzeButton: document.querySelector("#analyzeButton"),
        exampleButton: document.querySelector("#exampleButton"),
        clearButton: document.querySelector("#clearButton"),
        copySummaryButton: document.querySelector("#copySummaryButton"),
        copyReportButton: document.querySelector("#copyReportButton"),
        visitCounter: document.querySelector("#visitCounter"),
      };

let authors = [];
let rows = [];
let visibleLimit = RESULT_BATCH_SIZE;

function normalize(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u00df/g, "ss")
    .replace(/\u00e6/g, "ae")
    .replace(/\u0153/g, "oe")
    .replace(/[\u00f8\u0142]/g, (character) =>
      character === "\u00f8" ? "o" : "l",
    )
    .replace(/[\u0111\u00f0]/g, "d")
    .replace(/\u00fe/g, "th")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizedTokens(value) {
  return normalize(value).split(" ").filter(Boolean);
}

function cleanAuthor(author) {
  const cleaned = String(author)
    .trim()
    .replace(/^\s*(?:(?:y|e|and)\s+|&\s*)/i, "")
    .replace(/;\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  const endsWithInitial =
    /(?:^|[\s,])(?:[A-Za-z\u00c0-\u024f]\.\s*){1,4}$/.test(cleaned);
  return endsWithInitial ? cleaned : cleaned.replace(/\.\s*$/, "");
}

function isInitialToken(token) {
  return /^[a-z]$/.test(token);
}

function isInitialGroup(part) {
  const tokens = normalizedTokens(part);
  return tokens.length > 0 && tokens.every(isInitialToken);
}

function shouldMergeAuthorParts(current, next, allowTwoGivenNames = false) {
  if (!current || !next || isInitialGroup(current)) return false;
  if (isInitialGroup(next)) return true;

  const currentTokens = normalizedTokens(current);
  const nextTokens = normalizedTokens(next);
  const nextLooksLikeOneGivenName =
    nextTokens.length === 1 && nextTokens[0].length > 1;
  const currentHasHyphen = /[-\u2010-\u2015]/.test(current);
  const nextLooksLikeGivenNames =
    nextTokens.length > 0 &&
    nextTokens.length <= 3 &&
    nextTokens.every(
      (token) => isInitialToken(token) || token.length > 1,
    );

  return (
    (nextLooksLikeOneGivenName && currentTokens.length <= 3) ||
    (currentHasHyphen && nextLooksLikeGivenNames) ||
    (allowTwoGivenNames &&
      nextLooksLikeGivenNames &&
      currentTokens.length <= 3)
  );
}

function splitConnectorGroups(value) {
  return String(value)
    .split(/[\n;]+/)
    .flatMap((group) =>
      group.split(/\s*(?:,\s*)?(?:&|\band\b|\by\b|\be\b)\s+/i),
    )
    .map((group) => group.trim())
    .filter(Boolean);
}

function parseAuthors(value) {
  const parsed = splitConnectorGroups(value)
    .flatMap((group) => {
      const parts = group.split(",").map(cleanAuthor).filter(Boolean);
      const merged = [];
      const looksLikeAlternatingApaList =
        parts.length >= 4 && parts.length % 2 === 0;

      for (let index = 0; index < parts.length; index++) {
        const current = parts[index];
        const next = parts[index + 1];
        const allowTwoGivenNames =
          parts.length === 2 || (looksLikeAlternatingApaList && index % 2 === 0);

        if (shouldMergeAuthorParts(current, next, allowTwoGivenNames)) {
          merged.push(`${current}, ${next}`);
          index++;
        } else {
          merged.push(current);
        }
      }
      return merged;
    })
    .map(cleanAuthor)
    .filter(Boolean);

  return Array.from(
    new Map(parsed.map((author) => [normalize(author), author])).values(),
  );
}

function removeSuffixes(tokens) {
  const result = [...tokens];
  while (result.length && NAME_SUFFIXES.has(result[result.length - 1])) {
    result.pop();
  }
  return result;
}

function primarySurnameTokens(surnameTokens) {
  if (!surnameTokens.length) return [];

  let end = 0;
  while (end < surnameTokens.length && SURNAME_PARTICLES.has(surnameTokens[end])) {
    end++;
  }
  if (end < surnameTokens.length) end++;
  return surnameTokens.slice(0, Math.max(1, end));
}

function buildAuthorProfile(author) {
  const display = cleanAuthor(author);
  const commaIndex = display.indexOf(",");
  let surnameTokens = [];
  let givenTokens = [];

  if (commaIndex >= 0) {
    surnameTokens = removeSuffixes(
      normalizedTokens(display.slice(0, commaIndex)),
    );
    givenTokens = removeSuffixes(
      normalizedTokens(display.slice(commaIndex + 1)),
    ).filter((token) => !NAME_NOISE_TOKENS.has(token));
  } else {
    const tokens = removeSuffixes(normalizedTokens(display)).filter(
      (token) => !NAME_NOISE_TOKENS.has(token),
    );
    let leadingInitialCount = 0;
    let trailingInitialCount = 0;

    while (
      leadingInitialCount < tokens.length &&
      isInitialToken(tokens[leadingInitialCount])
    ) {
      leadingInitialCount++;
    }
    while (
      trailingInitialCount < tokens.length &&
      isInitialToken(tokens[tokens.length - 1 - trailingInitialCount])
    ) {
      trailingInitialCount++;
    }

    if (leadingInitialCount > 0 && leadingInitialCount < tokens.length) {
      givenTokens = tokens.slice(0, leadingInitialCount);
      surnameTokens = tokens.slice(leadingInitialCount);
    } else if (
      trailingInitialCount > 0 &&
      trailingInitialCount < tokens.length
    ) {
      surnameTokens = tokens.slice(0, tokens.length - trailingInitialCount);
      givenTokens = tokens.slice(tokens.length - trailingInitialCount);
    } else if (tokens.length >= 3) {
      surnameTokens = tokens.slice(-2);
      givenTokens = tokens.slice(0, -2);
    } else if (tokens.length === 2) {
      givenTokens = tokens.slice(0, 1);
      surnameTokens = tokens.slice(1);
    } else {
      surnameTokens = tokens;
    }
  }

  const primarySurname = primarySurnameTokens(surnameTokens);
  const surnameVariants = [];
  const seenVariants = new Set();

  function addSurnameVariant(tokens, kind, baseScore) {
    const key = tokens.join(" ");
    if (!tokens.length || seenVariants.has(key)) return;
    seenVariants.add(key);
    surnameVariants.push({ tokens, kind, baseScore });
  }

  addSurnameVariant(surnameTokens, "full", 100);
  if (surnameTokens.length > 1) {
    addSurnameVariant([surnameTokens.join("")], "compact", 95);
  }
  addSurnameVariant(primarySurname, "primary", 82);

  const fullGivenTokens = givenTokens.filter((token) => token.length > 1);
  const givenInitials = Array.from(
    new Set(givenTokens.map((token) => token[0]).filter(Boolean)),
  );

  return {
    display,
    key: normalize(display),
    surnameTokens,
    primarySurname,
    primarySurnameKey: primarySurname.join(" "),
    surnameVariants,
    givenTokens,
    fullGivenTokens,
    givenInitials,
    primaryInitial: givenInitials[0] || "",
  };
}

function createWordPattern() {
  try {
    return new RegExp("[\\p{L}\\p{N}]+", "gu");
  } catch {
    return /[A-Za-z0-9\u00c0-\u024f]+/g;
  }
}

function tokenizeWithPositions(value) {
  const source = String(value);
  const pattern = createWordPattern();
  const tokens = [];
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const normalized = normalize(match[0]);
    if (!normalized) continue;
    tokens.push({
      raw: match[0],
      norm: normalized,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

function extractAuthorZone(reference) {
  const source = String(reference);
  let end = Math.min(source.length, MAX_AUTHOR_ZONE_LENGTH);
  const yearPattern = /(?:^|[^\d])((?:18|19|20)\d{2}[a-z]?)(?!\d)/gi;
  let yearMatch;

  while ((yearMatch = yearPattern.exec(source)) !== null) {
    const yearIndex = yearMatch.index + yearMatch[0].indexOf(yearMatch[1]);
    if (yearIndex >= 8) {
      end = Math.min(end, yearIndex);
      break;
    }
  }

  const externalIdIndex = source.search(/\b(?:doi\s*:|https?:\/\/|www\.)/i);
  if (externalIdIndex >= 8) end = Math.min(end, externalIdIndex);
  return source.slice(0, end).trim();
}

function limitedLevenshtein(left, right, limit = 2) {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > limit) return limit + 1;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    let rowMinimum = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const value = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
      current.push(value);
      rowMinimum = Math.min(rowMinimum, value);
    }

    if (rowMinimum > limit) return limit + 1;
    previous = current;
  }

  return previous[right.length];
}

function isAdjacentTransposition(left, right) {
  if (left.length !== right.length) return false;
  const differences = [];

  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) differences.push(index);
  }

  return (
    differences.length === 2 &&
    differences[1] === differences[0] + 1 &&
    left[differences[0]] === right[differences[1]] &&
    left[differences[1]] === right[differences[0]]
  );
}

function isLikelyTypo(actual, expected) {
  if (actual === expected) return true;
  const minimumLength = Math.min(actual.length, expected.length);
  const maximumLength = Math.max(actual.length, expected.length);

  if (minimumLength < 5 || maximumLength > 24) return false;
  if (actual[0] !== expected[0]) return false;
  if (actual[actual.length - 1] !== expected[expected.length - 1]) {
    return false;
  }
  if (Math.abs(actual.length - expected.length) > 1) return false;

  if (actual.length !== expected.length) {
    return limitedLevenshtein(actual, expected, 1) === 1;
  }

  if (isAdjacentTransposition(actual, expected)) return true;
  let differences = 0;
  for (let index = 0; index < actual.length; index++) {
    if (actual[index] !== expected[index]) differences++;
  }
  return actual.length >= 6 && differences === 1;
}

function compareSurnameSequence(tokens, start, expectedTokens) {
  if (start + expectedTokens.length > tokens.length) return null;
  let fuzzyCount = 0;

  for (let offset = 0; offset < expectedTokens.length; offset++) {
    const actual = tokens[start + offset].norm;
    const expected = expectedTokens[offset];
    if (actual === expected) continue;
    if (!isLikelyTypo(actual, expected)) return null;
    fuzzyCount++;
    if (fuzzyCount > 1) return null;
  }

  return { fuzzyCount };
}

function hasHardBoundary(source, leftToken, rightToken) {
  const start = Math.min(leftToken.end, rightToken.end);
  const end = Math.max(leftToken.start, rightToken.start);
  const between = source.slice(start, end);
  return /[;&]|\band\b|\b(?:y|e)\b(?!\s*\.)/i.test(between);
}

function givenTokenQuality(token, profile) {
  const value = token.norm;
  if (!profile.primaryInitial || NAME_NOISE_TOKENS.has(value)) return 0;

  if (value.length === 1) {
    if (value === profile.primaryInitial) return 31;
    return profile.givenInitials.includes(value) ? 27 : 0;
  }
  if (CONNECTOR_TOKENS.has(value) || SURNAME_PARTICLES.has(value)) return 0;
  if (profile.fullGivenTokens.includes(value)) return 36;
  if (
    profile.fullGivenTokens.length === 0 &&
    value[0] === profile.primaryInitial
  ) {
    return 22;
  }
  return 0;
}

function isBridgeToken(token, profile) {
  const value = token.norm;
  if (isInitialToken(value)) return true;
  if (CONNECTOR_TOKENS.has(value)) return false;
  return (
    profile.fullGivenTokens.includes(value) ||
    SURNAME_PARTICLES.has(value)
  );
}

function findNearbyGiven(tokens, source, surnameStart, surnameEnd, profile) {
  if (!profile.primaryInitial) return null;
  const candidates = [];

  for (const direction of [-1, 1]) {
    for (let distance = 1; distance <= 3; distance++) {
      const position =
        direction < 0 ? surnameStart - distance : surnameEnd + distance;
      if (position < 0 || position >= tokens.length) break;

      const bridgeTokens =
        direction < 0
          ? tokens.slice(position + 1, surnameStart)
          : tokens.slice(surnameEnd + 1, position);
      if (!bridgeTokens.every((token) => isBridgeToken(token, profile))) {
        break;
      }

      const candidateToken = tokens[position];
      const boundaryLeft =
        direction < 0 ? candidateToken : tokens[surnameEnd];
      const boundaryRight =
        direction < 0 ? tokens[surnameStart] : candidateToken;
      if (hasHardBoundary(source, boundaryLeft, boundaryRight)) break;

      const quality = givenTokenQuality(candidateToken, profile);
      if (quality) {
        candidates.push({
          position,
          quality,
          start: Math.min(position, surnameStart),
          end: Math.max(position, surnameEnd),
        });
      } else if (!isBridgeToken(candidateToken, profile)) {
        break;
      }
    }
  }

  return candidates.sort((left, right) => right.quality - left.quality)[0] || null;
}

function findCollectiveSuffix(tokens, surnameEnd) {
  const patterns = [
    ["et", "al"],
    ["and", "others"],
    ["y", "otros"],
    ["y", "cols"],
    ["y", "colaboradores"],
    ["e", "colaboradores"],
  ];

  for (const pattern of patterns) {
    const start = surnameEnd + 1;
    const values = tokens.slice(start, start + pattern.length).map((token) => token.norm);
    if (values.length === pattern.length && values.every((value, index) => value === pattern[index])) {
      return { start, end: start + pattern.length - 1 };
    }
  }
  return null;
}

function isStandaloneSurname(tokens, surnameStart, surnameEnd) {
  return tokens.every((token, index) => {
    if (index >= surnameStart && index <= surnameEnd) return true;
    return /^\d+$/.test(token.norm);
  });
}

function isPrimarySurnameUnique(profile, allProfiles) {
  if (!profile.primarySurnameKey) return false;
  return (
    allProfiles.filter(
      (candidate) => candidate.primarySurnameKey === profile.primarySurnameKey,
    ).length === 1
  );
}

function surfaceFromTokenRange(source, tokens, start, end) {
  if (!tokens[start] || !tokens[end]) return "";
  return source
    .slice(tokens[start].start, tokens[end].end)
    .replace(/^\s*[,;:]?\s*/, "")
    .replace(/\s*[,;:]?\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findAuthorMatch(reference, profile, allProfiles = [profile]) {
  if (!profile || !profile.surnameVariants.length) return null;

  const source = extractAuthorZone(reference);
  const tokens = tokenizeWithPositions(source);
  const primaryUnique = isPrimarySurnameUnique(profile, allProfiles);
  let bestMatch = null;

  for (const variant of profile.surnameVariants) {
    for (let start = 0; start < tokens.length; start++) {
      const sequence = compareSurnameSequence(tokens, start, variant.tokens);
      if (!sequence) continue;

      const surnameEnd = start + variant.tokens.length - 1;
      const given = findNearbyGiven(tokens, source, start, surnameEnd, profile);
      const suffix = findCollectiveSuffix(tokens, surnameEnd);
      const standalone = isStandaloneSurname(tokens, start, surnameEnd);
      const exactSequence = sequence.fuzzyCount === 0;

      let accepted = false;
      let score = variant.baseScore - sequence.fuzzyCount * 12;
      let rangeStart = start;
      let rangeEnd = surnameEnd;
      let method = "";

      if (given) {
        accepted = true;
        score += given.quality;
        rangeStart = given.start;
        rangeEnd = given.end;
        method = given.quality >= 36 ? "given-name" : "initial";
      } else if (suffix) {
        const fullEnough = variant.kind !== "primary";
        const safePrimary =
          variant.kind === "primary" && primaryUnique && exactSequence;
        if (fullEnough || safePrimary) {
          accepted = true;
          score += 15;
          rangeEnd = suffix.end;
          method = "collective-form";
        }
      } else if (standalone && exactSequence) {
        const fullEnough = variant.kind !== "primary";
        const safeSingleSurname =
          variant.kind === "primary" &&
          profile.surnameTokens.length === 1 &&
          primaryUnique;
        if (fullEnough || safeSingleSurname) {
          accepted = true;
          score += 10;
          method = "standalone-surname";
        }
      }

      if (!accepted) continue;

      const candidate = {
        author: profile.display,
        surface: surfaceFromTokenRange(source, tokens, rangeStart, rangeEnd),
        score,
        fuzzy: sequence.fuzzyCount > 0,
        method,
        surnameVariant: variant.kind,
      };

      if (
        !bestMatch ||
        candidate.score > bestMatch.score ||
        (candidate.score === bestMatch.score &&
          candidate.surface.length > bestMatch.surface.length)
      ) {
        bestMatch = candidate;
      }
    }
  }

  return bestMatch;
}

function formatMatchLabel(match) {
  const surface = String(match.surface || "").trim();
  if (!surface || normalize(surface) === normalize(match.author)) {
    return match.author;
  }

  const clippedSurface =
    surface.length > 90 ? `${surface.slice(0, 87)}...` : surface;
  const description = match.fuzzy
    ? "variante con posible errata"
    : "variante reconocida";
  return `${match.author} (${description}: \u00ab${clippedSurface}\u00bb)`;
}

function splitReferences(value) {
  return String(value)
    .split(/\n+/)
    .map((reference) => reference.trim())
    .filter(Boolean);
}

function classifyReferences(references, authorNames, evaluatedAuthor) {
  const profiles = authorNames
    .map(buildAuthorProfile)
    .filter((profile) => profile.surnameTokens.length > 0);
  const evaluatedKey = normalize(evaluatedAuthor);
  const evaluatedProfile =
    profiles.find((profile) => profile.key === evaluatedKey) ||
    buildAuthorProfile(evaluatedAuthor);
  const coauthorProfiles = profiles.filter(
    (profile) => profile.key !== evaluatedProfile.key,
  );
  const allProfiles = profiles.some(
    (profile) => profile.key === evaluatedProfile.key,
  )
    ? profiles
    : [...profiles, evaluatedProfile];

  return references.map((reference, index) => {
    const selfMatch = findAuthorMatch(reference, evaluatedProfile, allProfiles);
    const coauthorMatches = coauthorProfiles
      .map((profile) => findAuthorMatch(reference, profile, allProfiles))
      .filter(Boolean);
    const type = selfMatch ? "SELF" : coauthorMatches.length ? "B" : "A";
    const detectedMatches = selfMatch ? [selfMatch] : coauthorMatches;

    return {
      id: index + 1,
      reference,
      type,
      detectedType: type,
      matches: detectedMatches.map(formatMatchLabel),
      matchData: detectedMatches,
    };
  });
}

function typeLabel(type) {
  if (type === "A") return "Tipo A";
  if (type === "B") return "Tipo B";
  return "Tipo C \u00b7 Autocita";
}

function getReferences() {
  return splitReferences(elements.citingInput.value);
}

function updateReferenceCount() {
  const count = getReferences().length;
  elements.referenceCount.textContent = `${count.toLocaleString("es-MX")} ${
    count === 1 ? "referencia" : "referencias"
  }`;
}

function invalidateResults() {
  rows = [];
  elements.resultsSection.hidden = true;
  hideError();
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.hidden = false;
}

function hideError() {
  elements.errorMessage.textContent = "";
  elements.errorMessage.hidden = true;
}

function renderAuthors() {
  const previous = elements.evaluatedAuthor.value;
  authors = parseAuthors(elements.authorsInput.value);
  elements.authorPreview.replaceChildren();

  authors.forEach((author) => {
    const chip = document.createElement("span");
    chip.textContent = author;
    elements.authorPreview.append(chip);
  });

  elements.evaluatedAuthor.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Selecciona un autor";
  elements.evaluatedAuthor.append(placeholder);

  authors.forEach((author) => {
    const option = document.createElement("option");
    option.value = author;
    option.textContent = author;
    elements.evaluatedAuthor.append(option);
  });

  const preserved = authors.find(
    (author) => normalize(author) === normalize(previous),
  );
  elements.evaluatedAuthor.value = preserved || "";
  elements.evaluatedAuthor.disabled = authors.length === 0;
}

function analyze() {
  const references = getReferences();
  const evaluated = elements.evaluatedAuthor.value;

  if (!elements.documentReference.value.trim()) {
    showError("Escribe la referencia del documento que vas a analizar.");
    return;
  }
  if (!authors.length) {
    showError("A\u00f1ade al menos un autor del documento original.");
    return;
  }
  if (!evaluated) {
    showError("Selecciona al investigador evaluado.");
    return;
  }
  if (!references.length) {
    showError("Pega al menos una referencia que cite al documento.");
    return;
  }

  rows = classifyReferences(references, authors, evaluated);
  visibleLimit = RESULT_BATCH_SIZE;
  hideError();
  renderResults();
  elements.resultsSection.hidden = false;
  elements.resultsSection.scrollIntoView({ behavior: "smooth" });
}

function getCounts() {
  return rows.reduce(
    (counts, row) => {
      counts[row.type]++;
      return counts;
    },
    { A: 0, B: 0, SELF: 0 },
  );
}

function createCell(className, value) {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = value;
  return cell;
}

function renderRows() {
  elements.resultsBody.replaceChildren();

  rows.slice(0, visibleLimit).forEach((row) => {
    const tableRow = document.createElement("tr");
    tableRow.append(createCell("row-number", String(row.id)));
    tableRow.append(createCell("reference-cell", row.reference));
    tableRow.append(
      createCell(
        row.matches.length ? "" : "muted",
        row.matches.join(", ") || "Ninguna",
      ),
    );

    const classificationCell = document.createElement("td");
    const control = document.createElement("div");
    control.className = "classification-control";
    const select = document.createElement("select");
    select.className = `classification-select select-${row.type.toLowerCase()}`;
    select.setAttribute(
      "aria-label",
      `Clasificaci\u00f3n de la referencia ${row.id}`,
    );

    [
      ["A", "Tipo A"],
      ["B", "Tipo B"],
      ["SELF", "Tipo C \u00b7 Autocita"],
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    });
    select.value = row.type;
    select.addEventListener("change", () => {
      row.type = select.value;
      renderResults();
    });
    control.append(select);

    if (row.type !== row.detectedType) {
      const restore = document.createElement("button");
      restore.className = "restore-button";
      restore.type = "button";
      restore.textContent = `Restablecer a ${typeLabel(row.detectedType)}`;
      restore.addEventListener("click", () => {
        row.type = row.detectedType;
        renderResults();
      });
      control.append(restore);
    }

    classificationCell.append(control);
    tableRow.append(classificationCell);
    elements.resultsBody.append(tableRow);
  });
}

function renderResults() {
  const counts = getCounts();
  const eligible = counts.A + counts.B;
  elements.countA.textContent = counts.A.toLocaleString("es-MX");
  elements.countB.textContent = counts.B.toLocaleString("es-MX");
  elements.countC.textContent = counts.SELF.toLocaleString("es-MX");
  elements.eligibleTotal.textContent = eligible.toLocaleString("es-MX");
  elements.resultsDescription.textContent = `${rows.length.toLocaleString(
    "es-MX",
  )} referencias revisadas para ${
    elements.evaluatedAuthor.value
  }. Puedes corregir cualquier clasificaci\u00f3n en la tabla.`;
  renderRows();

  const shown = Math.min(rows.length, visibleLimit);
  const remaining = Math.max(rows.length - shown, 0);
  elements.pagination.hidden = remaining === 0;
  elements.paginationText.textContent = `Mostrando ${shown.toLocaleString(
    "es-MX",
  )} de ${rows.length.toLocaleString("es-MX")} referencias`;
  elements.showMoreButton.textContent = `Mostrar ${Math.min(
    RESULT_BATCH_SIZE,
    remaining,
  )} m\u00e1s`;
}

function buildSummaryText(documentReference, evaluatedAuthor, analysisRows) {
  const counts = analysisRows.reduce(
    (totals, row) => {
      totals[row.type]++;
      return totals;
    },
    { A: 0, B: 0, SELF: 0 },
  );
  const eligible = counts.A + counts.B;
  const pctA = eligible ? Math.round((counts.A / eligible) * 100) : 0;
  const pctB = eligible ? Math.round((counts.B / eligible) * 100) : 0;
  return [
    "RESULTADO DEL AN\u00c1LISIS DE CITAS",
    "",
    `Investigador evaluado: ${evaluatedAuthor}`,
    "",
    "Referencia del documento analizado:",
    documentReference.trim(),
    "",
    "RESUMEN DE CLASIFICACI\u00d3N",
    "",
    `Total de referencias analizadas: ${analysisRows.length}`,
    `Citas consideradas (A + B): ${eligible}`,
    `Citas tipo A: ${counts.A} (${pctA}% de las citas consideradas)`,
    `Citas tipo B: ${counts.B} (${pctB}% de las citas consideradas)`,
    `Citas tipo C (autocitas del evaluado): ${counts.SELF}`,
  ].join("\n");
}

function buildDetailText(analysisRows) {
  return analysisRows
    .map((row) => {
      const lines = [
        `${row.id}. ${typeLabel(row.type)}`,
        `Referencia: ${row.reference}`,
        `Coincidencia: ${row.matches.join(", ") || "Ninguna"}`,
      ];
      if (row.type !== row.detectedType) {
        lines.push(
          `Nota: clasificaci\u00f3n ajustada manualmente; detecci\u00f3n original: ${typeLabel(
            row.detectedType,
          )}.`,
        );
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function buildReportText(documentReference, evaluatedAuthor, analysisRows) {
  const detail = buildDetailText(analysisRows);
  return `${buildSummaryText(
    documentReference,
    evaluatedAuthor,
    analysisRows,
  )}\n\nDETALLE POR REFERENCIA${detail ? `\n\n${detail}` : ""}`;
}

function summaryText() {
  return buildSummaryText(
    elements.documentReference.value,
    elements.evaluatedAuthor.value,
    rows,
  );
}

function reportText() {
  return buildReportText(
    elements.documentReference.value,
    elements.evaluatedAuthor.value,
    rows,
  );
}

async function copyText(text, button, defaultLabel) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const fallback = document.createElement("textarea");
      fallback.value = text;
      fallback.setAttribute("readonly", "");
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      fallback.select();
      document.execCommand("copy");
      fallback.remove();
    }
    button.textContent = "Copiado";
    window.setTimeout(() => (button.textContent = defaultLabel), 1600);
  } catch {
    button.textContent = "No se pudo copiar";
    window.setTimeout(() => (button.textContent = defaultLabel), 1800);
  }
}

function loadExample() {
  elements.documentReference.value = EXAMPLE.document;
  elements.authorsInput.value = EXAMPLE.authors;
  renderAuthors();
  elements.evaluatedAuthor.value = EXAMPLE.evaluated;
  elements.citingInput.value = EXAMPLE.citing;
  updateReferenceCount();
  invalidateResults();
}

function clearAll() {
  elements.documentReference.value = "";
  elements.authorsInput.value = "";
  elements.citingInput.value = "";
  renderAuthors();
  updateReferenceCount();
  invalidateResults();
}

async function loadVisitCounter() {
  try {
    const response = await fetch("/api/visits", {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const payload = await response.json();
    if (typeof payload.count !== "number") return;
    elements.visitCounter.textContent = `${payload.count.toLocaleString(
      "es-MX",
    )} visitas`;
    elements.visitCounter.hidden = false;
  } catch {
    // The classifier keeps working even when the host does not support PHP.
  }
}

const publicApi = {
  EXAMPLE,
  normalize,
  parseAuthors,
  buildAuthorProfile,
  extractAuthorZone,
  findAuthorMatch,
  classifyReferences,
  splitReferences,
  buildSummaryText,
  buildDetailText,
  buildReportText,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = publicApi;
}

if (elements) {
  elements.authorsInput.addEventListener("input", () => {
    renderAuthors();
    invalidateResults();
  });
  elements.documentReference.addEventListener("input", invalidateResults);
  elements.evaluatedAuthor.addEventListener("change", invalidateResults);
  elements.citingInput.addEventListener("input", () => {
    updateReferenceCount();
    invalidateResults();
  });
  elements.analyzeButton.addEventListener("click", analyze);
  elements.exampleButton.addEventListener("click", loadExample);
  elements.clearButton.addEventListener("click", clearAll);
  elements.copySummaryButton.addEventListener("click", () =>
    copyText(reportText(), elements.copySummaryButton, "Copiar resumen"),
  );
  elements.copyReportButton.addEventListener("click", () =>
    copyText(
      reportText(),
      elements.copyReportButton,
      "Copiar reporte completo",
    ),
  );
  elements.showMoreButton.addEventListener("click", () => {
    visibleLimit += RESULT_BATCH_SIZE;
    renderResults();
  });
  elements.showAllButton.addEventListener("click", () => {
    visibleLimit = rows.length;
    renderResults();
  });

  renderAuthors();
  updateReferenceCount();
  loadVisitCounter();
}
