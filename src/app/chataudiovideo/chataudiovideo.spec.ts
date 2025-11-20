import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Chataudiovideo } from './chataudiovideo';

describe('Chataudiovideo', () => {
  let component: Chataudiovideo;
  let fixture: ComponentFixture<Chataudiovideo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Chataudiovideo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Chataudiovideo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
