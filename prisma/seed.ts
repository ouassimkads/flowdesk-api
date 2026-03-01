import { PrismaClient, Role } from '../generated/client';
import * as bcrypt from 'bcryptjs';

// const prisma = new PrismaClient();

// async function main() {
//   console.log('🌱 Seeding database...');

//   // ── Admin user ──────────────────────────────────────────────────────────────
//   const adminPassword = await bcrypt.hash('admin123', 10);
//   const admin = await prisma.user.upsert({
//     where: { email: 'admin@flowdesk.com' },
//     update: {},
//     create: {
//       name: 'مدير النظام',
//       email: 'admin@flowdesk.com',
//       password: adminPassword,
//       role: Role.ADMIN,
//       avatarColor: '#1a1a2e',
//     },
//   });
//   console.log(`✅ Admin created: ${admin.email}`);

//   // ── Workflow steps ───────────────────────────────────────────────────────────
//   const stepDefs = [
//     { position: 1, label: 'المعلومات الشخصية', description: 'ارفع الهوية الوطنية أو جواز السفر أو وثيقة رسمية', icon: '👤' },
//     { position: 2, label: 'التحقق من العنوان', description: 'فاتورة خدمات أو كشف حساب بنكي (خلال آخر 3 أشهر)', icon: '🏠' },
//     { position: 3, label: 'المستندات المالية', description: 'كشوف البنك، الإقرارات الضريبية، أو إثبات الدخل', icon: '💳' },
//     { position: 4, label: 'الإقرار الختامي', description: 'نموذج الإقرار الموقّع وأي مستندات داعمة', icon: '✍️' },
//   ];

//   for (const step of stepDefs) {
//     await prisma.workflowStep.upsert({
//       where: { position: step.position },
//       update: {},
//       create: step,
//     });
//   }
//   console.log(`✅ ${stepDefs.length} workflow steps created`);

//   // ── Sample applicant ─────────────────────────────────────────────────────────
//   const applicantPassword = await bcrypt.hash('applicant123', 10);
//   const applicant = await prisma.user.upsert({
//     where: { email: 'applicant@flowdesk.com' },
//     update: {},
//     create: {
//       name: 'أمارا أوسي',
//       email: 'applicant@flowdesk.com',
//       password: applicantPassword,
//       role: Role.APPLICANT,
//       avatarColor: '#C084FC',
//     },
//   });

//   const steps = await prisma.workflowStep.findMany({ orderBy: { position: 'asc' } });

//   const application = await prisma.application.upsert({
//     where: { applicantId: applicant.id },
//     update: {},
//     create: {
//       applicantId: applicant.id,
//       steps: {
//         create: steps.map((step, i) => ({
//           workflowStepId: step.id,
//           status: i === 0 ? 'UNLOCKED' : 'LOCKED',
//           unlockedAt: i === 0 ? new Date() : null,
//         })),
//       },
//     },
//   });
//   console.log(`✅ Sample applicant created: ${applicant.email}`);
//   console.log(`✅ Application created: ${application.id}`);

//   console.log('\n🎉 Seed complete!');
//   console.log('   Admin:     admin@flowdesk.com / admin123');
//   console.log('   Applicant: applicant@flowdesk.com / applicant123');
// }

// main()
//   .catch(console.error)
//   .finally(() => prisma.$disconnect());
