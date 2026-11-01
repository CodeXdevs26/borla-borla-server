// Run after prisma db push, with the backend stopped.
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function ensureContactIndexes(collection) {
  for (const field of ['email', 'phoneNumber']) {
    // Build the replacement first. Null/missing contacts must not be unique.
    await collection.createIndex(
      { [field]: 1 },
      {
        name: `User_${field}_unique_present`,
        unique: true,
        partialFilterExpression: { [field]: { $type: 'string' } },
      },
    );
    const indexes = await collection.listIndexes().toArray();
    for (const index of indexes) {
      if (
        index.unique &&
        !index.partialFilterExpression &&
        Object.keys(index.key).length === 1 &&
        index.key[field] === 1
      ) {
        await collection.dropIndex(index.name);
      }
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const client = new MongoClient(process.env.DATABASE_URL);
  try {
    await client.connect();
    await ensureContactIndexes(client.db().collection('User'));
    console.log('Email and phone partial unique indexes are ready.');
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main().catch(() => {
    console.error(
      'Contact index setup failed. Check database access, index conflicts and duplicate email/phone values before starting the backend.',
    );
    process.exitCode = 1;
  });
}
module.exports = { ensureContactIndexes };
