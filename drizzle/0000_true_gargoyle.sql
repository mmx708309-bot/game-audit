CREATE TABLE `dailyChallengeScores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dateKey` varchar(10) NOT NULL,
	`points` int NOT NULL,
	`correctCount` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyChallengeScores_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailyChallenge_user_day_unique` UNIQUE(`userId`,`dateKey`)
);
--> statement-breakpoint
CREATE TABLE `quizRounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mode` varchar(20) NOT NULL,
	`category` varchar(80) NOT NULL,
	`points` int NOT NULL,
	`correctCount` int NOT NULL,
	`questionCount` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizRounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE INDEX `dailyChallenge_day_points_idx` ON `dailyChallengeScores` (`dateKey`,`points`);--> statement-breakpoint
CREATE INDEX `quizRounds_user_completed_idx` ON `quizRounds` (`userId`,`completedAt`);--> statement-breakpoint
CREATE INDEX `quizRounds_mode_completed_idx` ON `quizRounds` (`mode`,`completedAt`);