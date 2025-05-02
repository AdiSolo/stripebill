-- AddForeignKey
ALTER TABLE "InvoiceLink" ADD CONSTRAINT "InvoiceLink_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
