import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './stores/auth'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Join from './pages/Join'

import TeacherDashboard from './pages/guru/Dashboard'
import QuestionGenerator from './pages/guru/QuestionGenerator'
import QuestionDetail from './pages/guru/QuestionDetail'
import TeacherAnalytics from './pages/guru/Analytics'
import TeacherRecommendations from './pages/guru/Recommendations'
import WorkspaceDetail from './pages/guru/WorkspaceDetail'

import StudentHome from './pages/siswa/Home'
import StudentTasks from './pages/siswa/Tasks'
import StudentSession from './pages/siswa/Session'
import StudentProfile from './pages/siswa/Profile'
import StudentRecs from './pages/siswa/Recommendations'
import ProjectSubmit from './pages/siswa/ProjectSubmit'

export default function App() {
  const init = useAuth((s) => s.init)
  useEffect(() => {
    // tema tersimpan diterapkan sebelum halaman pertama render
    document.documentElement.dataset.theme = localStorage.getItem('vsc-theme') || 'light'
    init()
  }, [init])

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/masuk" replace />} />
      <Route path="/masuk" element={<Login />} />
      <Route path="/daftar" element={<Register />} />
      <Route path="/bergabung/:code" element={<Join />} />

      <Route
        path="/guru"
        element={
          <ProtectedRoute role="guru">
            <AppLayout role="guru" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="soal/baru" element={<QuestionGenerator />} />
        <Route path="soal/:id" element={<QuestionDetail />} />
        <Route path="analitik" element={<TeacherAnalytics />} />
        <Route path="rekomendasi" element={<TeacherRecommendations />} />
        <Route path="kelas/:id" element={<WorkspaceDetail />} />
      </Route>

      <Route
        path="/siswa"
        element={
          <ProtectedRoute role="siswa">
            <AppLayout role="siswa" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="beranda" replace />} />
        <Route path="beranda" element={<StudentHome />} />
        <Route path="tugas" element={<StudentTasks />} />
        <Route path="sesi/:topic" element={<StudentSession />} />
        <Route path="profil" element={<StudentProfile />} />
        <Route path="rekomendasi" element={<StudentRecs />} />
        <Route path="proyek" element={<ProjectSubmit />} />
      </Route>

      <Route path="*" element={<Navigate to="/masuk" replace />} />
    </Routes>
  )
}
