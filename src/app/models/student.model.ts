export interface Student {
  affidavitPath?: string;
    id: number;
    fullName: string;
    applicationId: string;
    dob: string; // LocalDate
    age: number;
    createdAt: string; // LocalDate
    applicationStatus: StudentStatus;
    email: string;
    contactNo: string;
    address: string;
    emergencyContactNo: string;
    emergencyRelation: string;
    passportNo?: string;
    passportValidTill?: string; // LocalDate
    passportPath?: string;
    intake: string;
    mothersName: string;
    fathersName: string;
    adhaarCardNo: string;
    adhaarPath?: string;

    // preferences
    collegePreferences: College[];

    class12thPassingYear: string;
    baords: string;
    class12thMarks: number;
    maxMarks: number;
    markseetPath?: string;

    hasGivenNEET: boolean;
    neetYear?: number;
    neetScore?: number;
    neetMarksheetPath?: string;

    appliedFor: string;
    nextStep?: StudentStatus;

    // assigned college
    college?: College;

    admissionManager?: any;

    confirmationPagePath?: string;
    admissionLetterPath?: string;
    conditionalOfferLetterPath?: string;
    profileImagePath?: string;
    updatedBy?: string;
    updatedByName?: string;

    universityPerson?: any;
    agent?: any;

    paymentStatus: string; // Default "Pending"

    // Specialized Roles
    telexMan?: any;
    visaMan?: any;
    docPerson?: any;
    accountant?: any;

    // Telex Details
    telexNumber?: string;
    telexIssueDate?: string; // LocalDate
    telexDocumentsPath?: string;

    // New Fields for Telex Process
    passportValidationDate?: string; // LocalDate
    telexPaymentAmount?: number;
    telexPaymentScreenshotPath?: string;
    telexPaymentTxId?: string;
    telexPaymentReceivedAmount?: number;
    telexPaymentReceivedDate?: string; // LocalDate
    isTelexAccountantApproved?: boolean;
    isTelexDocApproved?: boolean;
    isTelexDocsVerified?: boolean;
    docPersonComment?: string;

    telexTuitionFee?: boolean;
    telexHostelFee?: boolean;
    telexMessFee?: boolean;
    telexContractFee?: boolean;
    telexRegistrationFee?: boolean;
    telexOneTimeCharge?: boolean;

    studentStatusHistory: StudentStatusHistory[];

    // Document Tracking
    originalDocLocation?: string;
    originalDocsSent?: boolean;
    docDeliveryMethod?: DocDeliveryMethod;
    courierPartner?: string;
    courierTrackingId?: string;
    selfPersonContact?: string;
    docTentativeReachDate?: string; // LocalDate
    docReceivedDate?: string; // LocalDate

    received12thMarksheet?: boolean;
    received10thMarksheet?: boolean;
    receivedNeetScorecard?: boolean;
    receivedPassport?: boolean;

    docReturnedDate?: string;
    docReturnMethod?: DocDeliveryMethod;
    docReturnTrackingId?: string;
    readyForDocReturn?: boolean;

    // Payment Details
    hasPaid?: boolean;
    paidAmount?: number;
    paidTo?: PaymentRecipient;
    ttCopyPath?: string;
    paymentConfirmationPath?: string;
    paymentDueDate?: string; // LocalDate
    paymentType?: PaymentType;

    // Personal/Visa Information
    surname?: string;
    firstName?: string;
    middleName?: string;
    sex?: string;
    countryOfBirth?: string;
    placeOfBirth?: string;
    maritalStatus?: MaritalStatus;
    citizenship?: string;
    previousCitizenship?: string;
    passportType?: PassportType;
    passportIssueDate?: string; // LocalDate
    passportExpirationDate?: string; // LocalDate
    durationOfVisaProcedure?: string;
    placeOfVisaIssuance?: string;
    visaPhotoPath?: string;
    visaPassportCopyPath?: string;

    // Visa Payment Fields
    visaPaymentRequestedAmount?: number;
    visaPaymentRequestedCurrency?: string;
    visaBankDetailsSentDate?: string; // LocalDate
    visaPaymentTxId?: string;
    visaPaymentConfirmationPath?: string;
    visaPaymentReceivedAmount?: number;
    visaPaymentReceivedDate?: string; // LocalDate

    // Bank Details
    visaBankName?: string;
    visaBankAccountNumber?: string;
    visaBankSwiftCode?: string;
    visaBankBeneficiaryName?: string;
    visaBankBranchAddress?: string;

    // Action fields (used for workflow)
    action?: any;
    actionOnUser?: any;
}

export interface College {
    id: number;
    collegeName: string;
    name?: string; // Alias for compatibility
    city?: string;
    country?: string;
}

export interface StudentStatusHistory {
    id: number;
    studentApplicationStatus: string; // API returns this field name
    status?: string; // Alias
    newStatus?: string;
    updatedBy: string;
    updatedByName?: string;
    updatedAt: string; // LocalDateTime
    remarks?: string;
}


export enum StudentStatus {
    REGISTERED = 'REGISTERED',
    UNDER_REVIEW = 'UNDER_REVIEW',
    APPROVED = 'APPROVED',
    ADMISSION_LETTER_GENERATED = 'ADMISSION_LETTER_GENERATED',
    TELEX_INITIATED = 'TELEX_INITIATED',
    TELEX_NUMBER_ISSUED = 'TELEX_NUMBER_ISSUED',
    VISA_APPLIED = 'VISA_APPLIED',
    VISA_STAMPED = 'VISA_STAMPED',
    REJECTED = 'REJECTED',
    REJECTED_BY_TELEX = 'REJECTED_BY_TELEX',
    COMPLETED = 'COMPLETED',
}

export enum DocDeliveryMethod {
    COURIER = 'COURIER',
    IN_PERSON = 'IN_PERSON'
}

export enum PaymentRecipient {
    UNIVERSITY = 'UNIVERSITY',
    AGENT = 'AGENT',
    COMPANY = 'COMPANY'
}

export enum PaymentType {
    CASH = 'CASH',
    ONLINE = 'ONLINE',
    CHEQUE = 'CHEQUE'
}

export enum MaritalStatus {
    SINGLE = 'SINGLE',
    MARRIED = 'MARRIED',
    DIVORCED = 'DIVORCED',
    WIDOWED = 'WIDOWED'
}

export enum PassportType {
    P = 'P', // Regular
    D = 'D', // Diplomatic
    O = 'O'  // Official
}
