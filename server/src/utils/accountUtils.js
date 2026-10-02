/**
 * Account Utility Functions
 * Enforces per-user unique normalized account names and deterministic cleanup.
 */

/**
 * Normalizes an account name for duplicate detection.
 * Rules:
 * - trim leading/trailing whitespace
 * - collapse multiple consecutive whitespace characters to a single space
 * - convert to lowercase
 *
 * Example:
 * " HDFC   Bank " -> "hdfc bank"
 * "hdfc bank"     -> "hdfc bank"
 * "HDFC Bank"     -> "hdfc bank"
 *
 * @param {string} name - Raw account name
 * @returns {string} Normalized account name
 */
export function normalizeAccountName(name) {
  if (!name || typeof name !== 'string') return ''
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Formats a clean display name by trimming and collapsing multiple spaces.
 * Preserves user's chosen casing.
 *
 * @param {string} name
 * @returns {string} Clean display name
 */
export function formatCleanAccountName(name) {
  if (!name || typeof name !== 'string') return ''
  return name.trim().replace(/\s+/g, ' ')
}

/**
 * Deterministically cleans up existing duplicate account names per user.
 *
 * Requirements:
 * - Preserves account IDs
 * - Preserves all transactions (ledger records)
 * - Preserves savings goals, opening balances, and financial history
 * - Renames ONLY duplicate display names using stable createdAt + id ordering
 * - Format: "HDFC Bank", "HDFC Bank (2)", "HDFC Bank (3)"
 * - Idempotent: repeated runs result in 0 modifications
 *
 * @param {object} prismaClient - Prisma client instance
 * @returns {Promise<{ totalAccounts: number, duplicatesRenamed: number, userBreakdown: Record<string, number> }>}
 */
export async function cleanupDuplicateAccountNames(prismaClient) {
  if (!prismaClient) {
    throw new Error('Prisma client is required for duplicate account cleanup.')
  }

  // Fetch all accounts with stable ordering: createdAt asc, id asc
  const allAccounts = await prismaClient.account.findMany({
    orderBy: [
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
  })

  // Group accounts by userId
  const accountsByUser = new Map()
  for (const acc of allAccounts) {
    const uid = acc.userId || 'user_default_primary'
    if (!accountsByUser.has(uid)) {
      accountsByUser.set(uid, [])
    }
    accountsByUser.get(uid).push(acc)
  }

  let totalRenamed = 0
  const userBreakdown = {}

  for (const [userId, accounts] of accountsByUser.entries()) {
    const usedNormalizedNames = new Set()
    const usedDisplayNames = new Set()
    let userRenamedCount = 0

    // First pass: register already clean original accounts
    for (const account of accounts) {
      const cleanName = formatCleanAccountName(account.name)
      const norm = normalizeAccountName(cleanName)

      if (!usedNormalizedNames.has(norm)) {
        // First occurrence keeps its original name!
        usedNormalizedNames.add(norm)
        usedDisplayNames.add(cleanName)

        // Ensure normalizedName is set if column exists and needs update
        if (account.normalizedName !== norm) {
          try {
            await prismaClient.account.update({
              where: { id: account.id },
              data: {
                name: cleanName,
                normalizedName: norm,
              },
            })
          } catch (e) {
            // If normalizedName column not yet in schema during early bootstrap
            await prismaClient.account.update({
              where: { id: account.id },
              data: { name: cleanName },
            })
          }
        }
      } else {
        // Duplicate detected! Deterministically calculate next available suffix
        // Extract base name without existing counter suffix if any
        const baseMatch = cleanName.match(/^(.*?)(?:\s+\((\d+)\))?$/)
        const baseName = baseMatch ? baseMatch[1].trim() : cleanName

        let counter = 2
        let candidateName = `${baseName} (${counter})`
        let candidateNorm = normalizeAccountName(candidateName)

        while (usedNormalizedNames.has(candidateNorm) || usedDisplayNames.has(candidateName)) {
          counter += 1
          candidateName = `${baseName} (${counter})`
          candidateNorm = normalizeAccountName(candidateName)
        }

        // Apply deterministic rename
        try {
          await prismaClient.account.update({
            where: { id: account.id },
            data: {
              name: candidateName,
              normalizedName: candidateNorm,
            },
          })
        } catch (e) {
          await prismaClient.account.update({
            where: { id: account.id },
            data: { name: candidateName },
          })
        }

        usedNormalizedNames.add(candidateNorm)
        usedDisplayNames.add(candidateName)
        userRenamedCount += 1
        totalRenamed += 1
      }
    }

    userBreakdown[userId] = userRenamedCount
  }

  return {
    totalAccounts: allAccounts.length,
    duplicatesRenamed: totalRenamed,
    userBreakdown,
  }
}
