-- CreateEnum: BudgetStatus
DO $$ BEGIN
 CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'PENDING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: ExpenseStatus
DO $$ BEGIN
 CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: ApprovalType
DO $$ BEGIN
 CREATE TYPE "ApprovalType" AS ENUM ('TICKET_CLOSE', 'BUDGET_APPROVAL', 'PROJECT_DELETE', 'EXPENSE_APPROVAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: ApprovalStatus
DO $$ BEGIN
 CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: TicketStatus
DO $$ BEGIN
 CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED', 'PENDING_CLOSE_APPROVAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: TicketPriority
DO $$ BEGIN
 CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add status column to Budget
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Budget' AND column_name = 'status'
    ) THEN
        ALTER TABLE "Budget" ADD COLUMN "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT';
    END IF;
END $$;

-- CreateTable: BudgetItem (if not exists)
CREATE TABLE IF NOT EXISTS "BudgetItem" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey for BudgetItem
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'BudgetItem_budgetId_fkey'
    ) THEN
        ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_budgetId_fkey" 
        FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable: Add status column to Expense
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Expense' AND column_name = 'status'
    ) THEN
        ALTER TABLE "Expense" ADD COLUMN "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING';
    END IF;
END $$;

-- CreateIndex: Add status index to Expense (if not exists)
CREATE INDEX IF NOT EXISTS "Expense_status_idx" ON "Expense"("status");

-- CreateTable: Approval (if not exists)
CREATE TABLE IF NOT EXISTS "Approval" (
    "id" TEXT NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Approval indexes (if not exists)
CREATE INDEX IF NOT EXISTS "Approval_targetId_idx" ON "Approval"("targetId");
CREATE INDEX IF NOT EXISTS "Approval_status_idx" ON "Approval"("status");

-- AddForeignKey: Approval requestedBy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Approval_requestedById_fkey'
    ) THEN
        ALTER TABLE "Approval" ADD CONSTRAINT "Approval_requestedById_fkey" 
        FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Approval approvedBy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Approval_approvedById_fkey'
    ) THEN
        ALTER TABLE "Approval" ADD CONSTRAINT "Approval_approvedById_fkey" 
        FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: Ticket (if not exists)
CREATE TABLE IF NOT EXISTS "Ticket" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Ticket indexes (if not exists)
CREATE INDEX IF NOT EXISTS "Ticket_projectId_idx" ON "Ticket"("projectId");
CREATE INDEX IF NOT EXISTS "Ticket_status_idx" ON "Ticket"("status");

-- AddForeignKey: Ticket project
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Ticket_projectId_fkey'
    ) THEN
        ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_projectId_fkey" 
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Ticket createdBy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Ticket_createdById_fkey'
    ) THEN
        ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdById_fkey" 
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Ticket assignedTo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Ticket_assignedToId_fkey'
    ) THEN
        ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" 
        FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: TicketComment (if not exists)
CREATE TABLE IF NOT EXISTS "TicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: TicketComment index (if not exists)
CREATE INDEX IF NOT EXISTS "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");

-- AddForeignKey: TicketComment ticket
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'TicketComment_ticketId_fkey'
    ) THEN
        ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" 
        FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: TicketComment user
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'TicketComment_userId_fkey'
    ) THEN
        ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
