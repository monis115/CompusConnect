export interface TelexApplicationDTO {
    // Agent info
    agentUsername?: string;

    // Document tracking
    originalDocLocation?: string;
    originalDocsSent?: boolean;
    docDeliveryMethod?: 'COURIER' | 'SELF_PERSON';
    courierPartner?: string;
    courierTrackingId?: string;
    selfPersonContact?: string;
    docTentativeReachDate?: string;

    // Payment
    hasPaid?: boolean;
    paidAmount?: number;
    paidTo?: 'UNIVERSITY' | 'COMPANY';
    paymentType?: 'FULL' | 'SEMESTER_WISE';
    paymentDueDate?: string;

    // Payment Components
    telexTuitionFee?: boolean;
    telexHostelFee?: boolean;
    telexMessFee?: boolean;
    telexContractFee?: boolean;
    telexRegistrationFee?: boolean;
    telexOneTimeCharge?: boolean;

    // Personal info
    surname?: string;
    firstName?: string;
    middleName?: string;
    sex?: string;
    countryOfBirth?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
    citizenship?: string;
    previousCitizenship?: string;

    // Passport
    passportType?: 'ORDINARY' | 'DIPLOMATIC' | 'OFFICIAL' | 'SERVICE';
    passportNumber?: string;
    passportIssueDate?: string;
    passportExpirationDate?: string;
    passportIssuedBy?: string;

    // Address & contact
    addressInUzbekistan?: string;
    previousVisitsToUzbekistan?: string;
    accompaniedPersons?: string;
    homeAddress?: string;

    // Occupation
    occupation?: string;
    placeOfWorkStudyPosition?: string;
    workStudyAddressTelephone?: string;
}
