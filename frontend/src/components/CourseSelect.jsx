import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { inputCls } from './ui/Form.jsx';

/** Department select + dependent course select. onChange receives { departmentId, courseId } as strings. */
export default function CourseSelect({ departmentId, courseId, onChange, required, anyLabel }) {
  const [depts, setDepts] = useState([]);
  const [courses, setCourses] = useState([]);
  useEffect(() => { api.departments().then(setDepts).catch(() => {}); }, []);
  useEffect(() => {
    if (!departmentId) { setCourses([]); return; }
    api.courses(departmentId).then(setCourses).catch(() => {});
  }, [departmentId]);
  return (
    <>
      <select className={inputCls} aria-label="Department" required={required} value={departmentId} onChange={e => onChange({ departmentId: e.target.value, courseId: '' })}>
        <option value="">{anyLabel || 'Select department'}</option>
        {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select className={inputCls} aria-label="Course" required={required} disabled={!departmentId} value={courseId} onChange={e => onChange({ departmentId, courseId: e.target.value })}>
        <option value="">{anyLabel ? 'Any course' : 'Select course'}</option>
        {courses.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
      </select>
    </>
  );
}
