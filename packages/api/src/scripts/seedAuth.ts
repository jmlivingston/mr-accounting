import { files, scopes } from '../config';
import { hashPassword } from '../services/authService';
import { writeJsonFile } from '../storage/jsonFile';

const testUser = {
  id: 'f3b1c0de-7a54-4c2e-9d0a-5b8e1f6a2c11',
  username: 'testuser',
  scopes: [scopes.transactionsRead, scopes.transactionsWrite],
};

const credentials = await hashPassword('Ch4Nip!RLNg');
await writeJsonFile(files.auth, { users: [{ ...testUser, ...credentials }] });
