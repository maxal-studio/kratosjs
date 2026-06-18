import { Migration } from '@mikro-orm/migrations';

/**
 * App-level migration — creates the `user` table before plugin migrations run.
 */
export class Migration20250100000000CreateUserTable extends Migration {
	async up(): Promise<void> {
		this.addSql(`
			create table if not exists \`user\` (
				\`id\` int unsigned not null auto_increment primary key,
				\`firstname\` varchar(255) not null,
				\`lastname\` varchar(255) null,
				\`email\` varchar(255) not null,
				\`password\` varchar(255) null,
				\`phone\` varchar(50) null,
				\`role\` varchar(50) not null default 'admin',
				\`profile_media_image\` json null,
				\`active\` tinyint(1) not null default 1,
				\`created_at\` datetime not null,
				unique key \`user_email_unique\` (\`email\`)
			) default character set utf8mb4 engine = InnoDB;
		`);
	}

	async down(): Promise<void> {
		this.addSql('drop table if exists `user`;');
	}
}
