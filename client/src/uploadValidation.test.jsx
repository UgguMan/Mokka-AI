// @vitest-environment jsdom
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {validateFile,MAX_BYTES} from './uploadValidation';
import Analyze from './pages/Analyze';
afterEach(cleanup);
it('accepts supported images and the exact size boundary',()=>{expect(validateFile({size:MAX_BYTES,type:'image/png'})).toBe('');expect(validateFile({size:10,type:'image/webp'})).toBe('');});
it('rejects missing, empty, oversize and unsupported uploads',()=>{expect(validateFile(null)).toMatch(/Choose/);expect(validateFile({size:0,type:'image/png'})).toMatch(/empty/);expect(validateFile({size:MAX_BYTES+1,type:'image/png'})).toMatch(/4 MB/);expect(validateFile({size:50,type:'image/svg+xml'})).toMatch(/JPEG/);});
it('shows accessible validation when submitted without a photo',()=>{render(<MemoryRouter><Analyze/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:/Analyze plant/}));expect(screen.getByRole('alert').textContent).toMatch(/Choose a leaf image/);});
it('rejects an unsupported selected file before sending it',()=>{render(<MemoryRouter><Analyze/></MemoryRouter>);fireEvent.change(screen.getByLabelText('Leaf image'),{target:{files:[new File(['text'],'x.txt',{type:'text/plain'})]}});expect(screen.getByRole('alert').textContent).toMatch(/JPEG/);});
