import io.github.piscescup.linq4j.Linq;

public class StudentQuery {
    record Student(String name, int score) {}

    public static void main(String[] args) {
        var names = Linq.of(
                new Student("Alice", 92),
                new Student("Bob", 75),
                new Student("Charlie", 88)
            )
            .where(student -> student.score() >= 80)
            .orderByDescending(Student::score)
            .select(Student::name)
            .toList();

        System.out.println(names);
    }
}
