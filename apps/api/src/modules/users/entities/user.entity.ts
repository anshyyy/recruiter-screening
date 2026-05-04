import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Application user row; table name is `users` (plural) for SQL conventions. */
@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 320, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'full_name' })
  fullName!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'role' })
  role!: string | null;

  /** Normalized skill tags (JSON array of strings). */
  @Column({ type: 'jsonb', name: 'skills', default: () => "'[]'::jsonb" })
  skills!: string[];

  /** S3 object key from `POST /uploads/presign-put` (user-owned prefix). */
  @Column({ type: 'varchar', length: 512, nullable: true, name: 'resume_object_key' })
  resumeObjectKey!: string | null;

  /** Original résumé file name for display and downloads. */
  @Column({ type: 'varchar', length: 260, nullable: true, name: 'resume_file_name' })
  resumeFileName!: string | null;

  /**
   * Monotonic session stamp: embedded in JWTs as `tv` and checked on each request.
   * Increment to invalidate all outstanding access tokens for this user.
   */
  @Column({ type: 'int', name: 'token_version', default: 0 })
  tokenVersion!: number;

  /** Bcrypt hash; column remains `password` in the database. Excluded from default SELECT. */
  @Column({ type: 'varchar', length: 255, nullable: true, select: false, name: 'password' })
  passwordHash!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
