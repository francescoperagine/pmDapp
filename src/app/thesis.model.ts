export class Thesis {
    department: string;
    secretariat: string;
    author: string;
    supervisor: string;
    title: string;
    course: string;
    registrationDate: number;
    publicationDate: number;
    embargoPeriod: number;
    fileUrl: string;
    hash;
    signature;
    secretariatPermission;
    authorPermission;
    supervisorPermission;
    ownPermission;

    // constructor(department, secretariat, author, supervisor, registrationDate, publicationDate) {
    //     this.department = department;
    //     this.secretariat = secretariat;
    //     this.author = author;
    //     this.supervisor = supervisor;
    //     this.registrationDate = registrationDate;
    //     this.publicationDate = publicationDate;
    // }

    isFinalizable() {
        if (this.secretariatPermission && this.authorPermission && this.supervisorPermission) {
            return true;
        }
    }
}

