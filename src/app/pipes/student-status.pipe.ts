import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'studentStatus', // Usage: {{ status | studentStatus }}
    standalone: true
})
export class StudentStatusPipe implements PipeTransform {

    transform(value: string | undefined | null): string {
        if (!value) return '';

        // Remove underscores
        let formatted = value.replace(/_/g, ' ');

        // Title case (capitalize first letter of each word)
        formatted = formatted.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');

        return formatted;
    }

}
