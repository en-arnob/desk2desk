import { MikroORM } from '@mikro-orm/postgresql';
import * as bcrypt from 'bcryptjs';
import { Role } from '@desk2desk/shared';
import config from './mikro-orm.config';
import { Category, Department, User } from './entities';

async function seed() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  const hash = await bcrypt.hash('d2d#', 10);

  // Departments
  const deptNames = ['IT', 'CRM', 'HR', 'Finance'];
  const departments: Record<string, Department> = {};
  for (const name of deptNames) {
    let dept = await em.findOne(Department, { name });
    if (!dept) {
      dept = em.create(Department, {
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      em.persist(dept);
    }
    departments[name] = dept;
  }

  // Categories
  const catDefs = [
    ['MIS Report', 'Database reports and data extracts'],
    ['Printer / Hardware', 'Printers, peripherals and physical hardware'],
    ['Network', 'Connectivity, VPN and network issues'],
    ['Software Install', 'Application installation and licensing'],
    ['Sales App Support', 'Sales Application Support'],
  ];
  const categories: Record<string, Category> = {};
  for (const [name, description] of catDefs) {
    let cat = await em.findOne(Category, { name });
    if (!cat) {
      cat = em.create(Category, {
        name,
        description,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      em.persist(cat);
    }
    categories[name] = cat;
  }

  await em.flush();

  async function upsertUser(
    id: string,
    name: string,
    role: Role,
    isProvider: boolean,
    deptName: string,
    catNames: string[] = [],
  ): Promise<void> {
    const existing = await em.findOne(
      User,
      { id },
      { populate: ['serviceCategories'] },
    );
    const user: User =
      existing ??
      em.create(User, {
        id,
        name,
        passwordHash: hash,
        role,
        isProvider,
        isActive: true,
        department: departments[deptName],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    user.role = role;
    user.isProvider = isProvider;
    user.department = departments[deptName];
    if (catNames.length) {
      user.serviceCategories.set(catNames.map((c) => categories[c]));
    }
    em.persist(user);
  }

  // Admin: manages everything and is also a provider for all categories.
  await upsertUser('002680', 'MD. KHORSHED ALAM', Role.ADMIN, true, 'IT', [
    'MIS Report',
    'Printer / Hardware',
    'Network',
    'Software Install',
  ]);
  await upsertUser('005019', 'KHALID IBN ALAM UTSOB', Role.ADMIN, true, 'IT', [
    'MIS Report',
  ]);
  await upsertUser('001043', 'MD. HASAN JOMADDER', Role.ADMIN, true, 'IT', [
    'MIS Report',
  ]);
  
  // Regular users who are also providers (handle support requests).
  await upsertUser('003143', 'MD SAIFUL ISLAM', Role.USER, true, 'IT', [
    'Printer / Hardware',
    'Network',
  ]);
  await upsertUser('003109', 'MD. HASIBUR RAHMAN', Role.USER, true, 'IT', [
    'MIS Report',
  ]);
  await upsertUser('003651', 'MUHAMMAD MAZHARUL ISLAM', Role.USER, true, 'IT', [
    'Network',
  ]);
  // Regular users (request support only).
  await upsertUser('007007', 'CRM Employee', Role.USER, false, 'CRM');
  await upsertUser('006006', 'HR Employee', Role.USER, false, 'HR');

  await em.flush();
  await orm.close(true);

  // eslint-disable-next-line no-console
  console.log('Seed complete. All users have password: d2d#');
  // eslint-disable-next-line no-console
  console.log(
    'Admin logins (Employee ID): 002680, 005019, 001043. Provider users: 003143, 003109, 003651. Plain users: 007007, 006006.',
  );
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
