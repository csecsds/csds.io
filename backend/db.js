import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const subjectsDb = Datastore.create({
    filename: path.join(__dirname, 'data', 'subjects.db'),
    autoload: true
});

export { subjectsDb };
