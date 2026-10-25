// @vitest-environment jsdom
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {MemoryRouter} from 'react-router-dom';
import Result from './pages/Result';
import {useResource} from './useResource';
vi.mock('./useResource',()=>({useResource:vi.fn()}));
afterEach(cleanup);
const local={predictionSource:'plantdoc_local',plantName:'Not determined',diseaseName:'Uncertain',status:'uncertain',classLabel:'uncertain',classifierAssessedCertainty:'low',classifier:{name:'Combined model',trainedOn:'PlantDoc + PlantVillage + PlantWild'},visualSymptoms:[],recommendations:['Ask an expert'],reasoningSummary:'The model abstained.',createdAt:'2026-10-25T00:00:00Z'};
it('displays an outside-class Gemini suggestion separately from the uncertain local result',()=>{
  useResource.mockReturnValue({data:{...local,explanationStatus:'gemini_fallback',geminiAssessment:{assessment:'suspected_disease',plantName:'Cucumber',suspectedDisease:'Downy mildew',visualSymptoms:['Yellow patches'],reasoningSummary:'A tentative suggestion.'}}});
  render(<MemoryRouter><Result/></MemoryRouter>);
  expect(screen.getByRole('heading',{name:'Possible Downy mildew'})).toBeInTheDocument();
  expect(screen.getByText('Not determined')).toBeInTheDocument();
  expect(screen.getByText(/ADDITIONAL GEMINI ASSESSMENT/)).toBeInTheDocument();
  expect(screen.getByText('PlantDoc + PlantVillage + PlantWild')).toBeInTheDocument();
});
it('does not fabricate an assessment when Gemini is unavailable',()=>{
  useResource.mockReturnValue({data:{...local,explanationStatus:'unavailable'}});
  render(<MemoryRouter><Result/></MemoryRouter>);
  expect(screen.queryByLabelText('Tentative Gemini assessment')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Gemini treatment and care summary')).not.toBeInTheDocument();
});
it.each([false,true])('shows treatment and care for the appropriate Gemini path: fallback=%s',fallback=>{
  const summaries={treatmentSummary:'Confirm the cause before removing affected leaves.',careSummary:'Water at soil level and monitor new growth.'};
  const data=fallback?{...local,geminiAssessment:{assessment:'uncertain',plantName:'',suspectedDisease:'',visualSymptoms:[],reasoningSummary:'Needs confirmation.',...summaries}}:{...local,...summaries};
  useResource.mockReturnValue({data});render(<MemoryRouter><Result/></MemoryRouter>);
  expect(screen.getByLabelText('Gemini treatment and care summary')).toBeInTheDocument();
  expect(screen.getByText(summaries.treatmentSummary)).toBeInTheDocument();
  expect(screen.getByText(summaries.careSummary)).toBeInTheDocument();
});
