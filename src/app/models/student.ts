export interface Student {
  affidavitPath?: string;
    fullName: string;
    dob: string;
    age: number;
    email: string;
    contactNo: string;
    address: string;
    districtId?: number | null;
    emergencyContactNo: string;
    emergencyRelation: string;
    mothersName: string;
    fathersName: string;
    passportNo: string;
    passportValidTill: string;
    adhaarCardNo: string;
    adhaarPath?: string;
    passportPath?: string;
    ticketPdfPath?: string;
    travelTicketPdfPath?: string;

    // Academic - 12th
    class12thPassingYear: string;
    baords: string;
    class12thMarks: number;
    maxMarks: number;
    markseetPath?: string;

    // Academic - NEET
    hasGivenNEET: boolean;
    neetYear: number;
    neetScore: number;
    neetMarksheetPath?: string;

    // Application
    intake: string;
    appliedFor: string;
    applicationStatus: string;
    confirmationPagePath?: string;
    admissionLetterPath?: string;

    // College Info (Agent context)
    collegeIds?: number[];
    collegeNames?: string[];
    userNameAgent?: string;
    assignedCollegeName?: string;
}
