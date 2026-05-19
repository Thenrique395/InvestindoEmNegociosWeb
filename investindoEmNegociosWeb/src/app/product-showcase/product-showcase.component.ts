
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-showcase',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-showcase.component.html',
  styleUrls: ['./product-showcase.component.scss']
})
export class ProductShowcaseComponent {}
