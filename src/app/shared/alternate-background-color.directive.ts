import { Directive, OnInit, Input, HostBinding } from '@angular/core';

@Directive({
  selector: '[appAlternateBackgroundColor]'
})

export class AlternateBackgroundColorDirective implements OnInit {
  @Input() evenColor: string = 'AliceBlue';
  @Input() oddColor: string = 'FloralWhite';
  @Input() index: number;
  @HostBinding('style.backgroundColor') backgroundColor: string;

  constructor() { }

  ngOnInit(): void {
    this.backgroundColor = (this.index % 2 === 0) ? this.evenColor : this.oddColor;
  }

}
